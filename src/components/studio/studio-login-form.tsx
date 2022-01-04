import * as React from 'react';
import Link from 'next/link';
import { ILogin } from 'src/interfaces';
import {
  Form, Input, Button, Checkbox, Alert, Space
} from 'antd';
import { connect } from 'react-redux';
import { updateUIValue } from 'src/redux/ui/actions';
import { getResponseError } from '@lib/utils';
import FormFooterLogin from '@components/auth/login/footer-login-form';

interface IProps {
  requesting?: boolean;
  submit(data: ILogin): Function;
  error?: string;
  success?: boolean;
  onRemember: Function;
  singularTextModel?: string;
}

const FormItem = Form.Item;

const StudioFormLogin = ({
  requesting, submit, error, success, onRemember, singularTextModel
}: IProps) => {
  const [form] = Form.useForm();
  const onPressEnter = () => {
    form.submit();
  };
  return (
    <Form layout="vertical" onFinish={submit}>
      <h1>Studio Sign in</h1>
      <FormItem
        hasFeedback
        label="Email"
        name="email"
        rules={[
          { type: 'email', message: 'The input is not valid E-mail!' },
          { required: true, message: 'Please input your email!' }
        ]}
      >
        <Input
          onPressEnter={onPressEnter}
          placeholder="youremail@example.com"
        />
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
              description={getResponseError(error)}
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
      <FormFooterLogin account="studio" singularTextModel={singularTextModel} />
    </Form>
  );
};
StudioFormLogin.defaultProps = {
  requesting: false,
  error: '',
  success: false,
  singularTextModel: ''
};
const mapStateToProps = (state) => ({
  ...state.ui
});
const mapDispatchs = { updateUIValue };
export default connect(mapStateToProps, mapDispatchs)(StudioFormLogin);
