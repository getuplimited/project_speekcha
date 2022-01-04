import Link from 'next/link';
import { ILogin } from 'src/interfaces';
import {
  Form, Input, Button, Space, Checkbox, Alert
} from 'antd';
import { getResponseError } from '@lib/utils';
import { connect } from 'react-redux';
import { usernamePatternRule } from '@lib/rules';
import FormFooterLogin from './footer-login-form';

interface IProps {
  requesting: boolean;
  submit(data: ILogin): Function;
  error: any;
  success: boolean;
  onRemember: Function;
  singularTextModel?: string;
}

const FormItem = Form.Item;

const LoginForm = ({
  requesting, submit, error, success, onRemember, singularTextModel
}: IProps) => {
  const [form] = Form.useForm();
  const onPressEnter = async () => {
    form.submit();
  };
  return (
    <Form layout="vertical" onFinish={submit}>
      <h1>
        {singularTextModel || 'Performer'}
        {' '}
        Sign In
      </h1>
      <FormItem
        hasFeedback
        label="Username"
        name="username"
        rules={[
          {
            required: true,
            message: 'Please input your username!'
          },
          usernamePatternRule
        ]}
      >
        <Input onPressEnter={onPressEnter} placeholder="Username" />
      </FormItem>
      <FormItem
        hasFeedback
        label={(
          <Space>
            <span>Password</span>
          </Space>
        )}
        className="input-password"
        name="password"
        rules={[
          { required: true, message: 'Please input your password!' },
          {
            min: 6,
            max: 14,
            message: '6-14 characters'
          }
        ]}
      >
        <Input.Password
          onPressEnter={onPressEnter}
          placeholder="Password"
        />
      </FormItem>
      <div style={{
        display: 'flex', justifyContent: 'space-between', width: '100%', margin: '15px 0'
      }}
      >
        <Checkbox onChange={(e) => onRemember(e.target.checked)}>Remember me</Checkbox>
        <Link href="/auth/forgot-password">
          <a>Forgot password?</a>
        </Link>
      </div>
      {(error || success) && (
        <FormItem>
          {error && (
            <Alert
              message="Error"
              description={
                error.message && error.message === 'ACCOUNT_INACTIVE'
                  ? 'Your account is deactivated'
                  : getResponseError(error)
              }
              type="error"
              showIcon
            />
          )}
          {success && (
            <Alert
              message="Login success"
              type="success"
              description="Redirecting..."
            />
          )}
        </FormItem>
      )}
      <FormItem className="row-button-auth">
        <Button type="primary" htmlType="submit" disabled={requesting} loading={requesting}>
          Sign in
        </Button>
      </FormItem>
      <FormFooterLogin account="performer" singularTextModel={singularTextModel} />
    </Form>
  );
};
const mapStates = (state: any) => ({
  ...state.ui
});
LoginForm.defaultProps = {
  singularTextModel: ''
};
export default connect(mapStates)(LoginForm);
