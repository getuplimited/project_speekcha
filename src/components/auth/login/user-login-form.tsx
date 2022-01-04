// import { useState } from 'react';
import Link from 'next/link';
import { ILogin } from 'src/interfaces';
import {
  Form, Input, Button, Space, Checkbox, Alert
} from 'antd';
import { getResponseError } from '@lib/utils';
import { connect } from 'react-redux';
import { updateUIValue } from 'src/redux/ui/actions';
import FormFooterLogin from './footer-login-form';

interface IProps {
  requesting: boolean;
  submit(data: ILogin): Function;
  error: any;
  success: boolean;
  onRemember: Function;
  singularTextModel:string;
}

const FormItem = Form.Item;

const LoginForm = ({
  requesting, submit, error, success, onRemember, singularTextModel
}: IProps) => {
  const [form] = Form.useForm();
  const onPressEnter = () => {
    form.submit();
  };
  return (
    <Form layout="vertical" onFinish={submit}>
      <h1>User Sign In</h1>
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
              description={
                error.message && error.message === 'ACCOUNT_INACTIVE'
                  ? 'You do not have permission'
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
      <FormFooterLogin account="user" singularTextModel={singularTextModel} />
    </Form>
  );
};
const mapStates = (state: any) => ({
  ...state.ui
});
const mapDispatch = { updateUIValue };
export default connect(mapStates, mapDispatch)(LoginForm);
